import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m074c414d test", function () {
  it("should kill mutant by verifying loop executes for non-empty recipients array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipientAddress = "0x0000000000000000000000000000000000000001";
    const recipients = [recipientAddress];
    const amounts = [1];

    await expect(
      instance.transfer(recipients, amounts)
    ).to.be.reverted;
  });
});