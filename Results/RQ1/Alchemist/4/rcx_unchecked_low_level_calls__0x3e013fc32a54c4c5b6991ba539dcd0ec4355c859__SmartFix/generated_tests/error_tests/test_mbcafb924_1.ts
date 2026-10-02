import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mbcafb924 detection", function () {
  it("should kill the mutant by causing arithmetic overflow in the require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Step 1: Fund the contract with max uint256 - 1 wei to set up overflow condition
    const maxUint256 = ethers.MaxUint256;
    const fundAmount = maxUint256 - 1n;
    await owner.sendTransaction({
      to: instanceAddress,
      value: fundAmount
    });

    // Verify the balance is set correctly
    const contractBalance = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalance).to.equal(fundAmount);

    // Step 2: Call multiplicate with 1 wei - this should cause overflow in the mutant
    // Original: balance + msg.value = (max-1) + 1 = max (no overflow)
    // Mutant: balance + msg.value + 1 = (max-1) + 1 + 1 = max + 1 (overflow!)
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 1n })
    ).to.be.reverted;

    // Step 3: Verify contract balance is unchanged (no transfer happened)
    const finalBalance = await ethers.provider.getBalance(instanceAddress);
    expect(finalBalance).to.equal(fundAmount);
  });
});