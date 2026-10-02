import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m77397e75 test", function () {
  it("should revert when called from unauthorized address due to require(msg.sender) check", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    await expect(
      instance.connect(unauthorized).transfer(tos, values)
    ).to.be.reverted;
  });
});