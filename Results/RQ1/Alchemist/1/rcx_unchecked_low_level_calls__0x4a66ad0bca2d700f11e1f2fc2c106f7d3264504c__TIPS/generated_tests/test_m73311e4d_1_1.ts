import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m73311e4d", function () {
  it("should detect mutant that changes caddress to address(this) by verifying external call fails", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const instanceAddress = await instance.getAddress();

    // Prepare test data
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // In the original contract, caddress is an external contract (0x1f844...)
    // In the mutant, caddress = address(this), meaning it will call itself
    // Since EBU does not implement transferFrom, the call will revert
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});