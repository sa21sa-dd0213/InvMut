import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc00f91a2 test", function () {
  it("should revert when _tos array is empty (original behavior), mutant passes without revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transfer with empty _tos array - original requires _tos.length > 0, mutant uses >= 0
    await expect(
      instance.transfer(owner.address, addr1.address, [], ethers.parseEther("1"))
    ).to.be.reverted;
  });
});