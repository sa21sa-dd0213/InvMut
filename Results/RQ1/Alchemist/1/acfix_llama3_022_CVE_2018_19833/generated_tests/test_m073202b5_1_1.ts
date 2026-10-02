import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection test", function () {
  it("should detect the mutant by testing transfer to an address with zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer tokens to addr1 to give it a non-zero balance
    await instance.transfer(addr1.address, 100);

    // Now transfer again to addr1 - the original check uses addition, mutant uses multiplication
    // The original: require(balanceOf[_to] + _value >= balanceOf[_to]) => 100 + 1 >= 100 => true
    // The mutant: require(balanceOf[_to] * _value >= balanceOf[_to]) => 100 * 1 >= 100 => true
    // Both pass, so we need a case where the multiplication fails but addition succeeds

    // Transfer to a new address with zero balance
    // Original: 0 + 5 >= 0 => true (passes)
    // Mutant: 0 * 5 >= 0 => 0 >= 0 => true (also passes)

    // The key difference: when _to has balance > 0 and _value > 1, 
    // original always passes due to overflow protection, mutant might behave differently
    // Let's test with balance[_to] = 2 and _value = 2
    // Original: 2 + 2 >= 2 => true
    // Mutant: 2 * 2 >= 2 => 4 >= 2 => true (both pass)

    // Actually, the real difference is when _value = 0
    // Original: balance[_to] + 0 >= balance[_to] => true
    // Mutant: balance[_to] * 0 >= balance[_to] => 0 >= balance[_to] => false if balance > 0

    // So test: transfer 0 tokens to an address with non-zero balance
    // This should succeed in original but fail in mutant
    await expect(
      instance.transfer(addr1.address, 0)
    ).to.be.reverted;
  });
});