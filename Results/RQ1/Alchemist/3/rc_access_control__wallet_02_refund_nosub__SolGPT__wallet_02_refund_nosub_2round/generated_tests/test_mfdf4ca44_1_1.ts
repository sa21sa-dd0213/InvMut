import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - migrateTo access control", function () {
  it("should revert when creator calls migrateTo on the mutant (since != is used instead of ==)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract first so there's balance to migrate
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The original requires creator == msg.sender, so owner should succeed
    // The mutant requires creator != msg.sender, so owner should revert
    await expect(
      instance.connect(owner).migrateTo(addr2.address)
    ).to.be.reverted;
  });
});