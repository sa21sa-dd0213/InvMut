import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mc5feba0d test", function () {
  it("should kill mutant by calling Command from Owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const data = "0x";
    const value = ethers.parseEther("1");

    // Fund the contract so it has some balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });

    // In the original contract, Owner can call Command successfully.
    // In the mutant, require(msg.sender != Owner) will revert for Owner.
    await expect(
      instance.connect(owner).Command(addr1.address, data, { value })
    ).to.not.be.reverted;
  });
});