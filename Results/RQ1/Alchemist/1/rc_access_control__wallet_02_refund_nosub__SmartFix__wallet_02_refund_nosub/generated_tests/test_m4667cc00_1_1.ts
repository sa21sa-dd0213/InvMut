import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - migrateTo access control", function () {
  it("should allow creator to call migrateTo and revert for non-creator (original behavior)", async function () {
    const [creator, nonCreator, recipient] = await ethers.getSigners();

    // Deploy the Wallet contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for migration
    const depositAmount = ethers.parseEther("1.0");
    await creator.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });

    // Test 1: Creator should be able to call migrateTo (original behavior)
    // The mutant will revert this call, killing the mutant
    const tx = instance.connect(creator).migrateTo(recipient.address);
    await expect(tx).to.not.be.reverted;

    // Verify the balance was transferred
    expect(await ethers.provider.getBalance(recipient.address)).to.equal(depositAmount);
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(0);
  });
});