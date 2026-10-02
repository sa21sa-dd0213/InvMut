import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - return true removal", function () {
  it("should return true on successful transfer from authorized address", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1];

    const tx = await instance.transfer(tos, amounts);
    const receipt = await tx.wait();

    // The original returns true, the mutant returns false (default)
    // We capture the return value by checking the transaction response
    const result = await instance.transfer.staticCall(tos, amounts);
    expect(result).to.be.true;
  });
});