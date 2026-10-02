import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfdf4ca44 test", function () {
  it("should revert when migrateTo is called by the creator (mutant uses != instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so migrateTo has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // In the original contract, creator (owner) can call migrateTo successfully.
    // In the mutant, the require(creator != msg.sender) will cause revert for the creator.
    await expect(
      instance.connect(owner).migrateTo(addr1.address)
    ).to.be.reverted;
  });
});