import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mb18f934c: transfer with positive value should succeed on original but fail on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Get initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);

    // Perform a transfer with a positive value (not zero)
    const transferValue = 100;
    const tx = await instance.connect(owner).transfer(addr1.address, transferValue);
    await tx.wait();

    // Check that the transfer succeeded - addr1's balance should have increased
    const finalBalance = await instance.balanceOf(addr1.address);
    expect(finalBalance).to.equal(initialBalance + BigInt(transferValue));

    // Additional check: owner's balance should have decreased
    const ownerBalance = await instance.balanceOf(owner.address);
    // Note: totalSupply = initialSupply * 10**decimals = 1000 * 1 = 1000
    expect(ownerBalance).to.equal(BigInt(initialSupply) - BigInt(transferValue));
  });
});