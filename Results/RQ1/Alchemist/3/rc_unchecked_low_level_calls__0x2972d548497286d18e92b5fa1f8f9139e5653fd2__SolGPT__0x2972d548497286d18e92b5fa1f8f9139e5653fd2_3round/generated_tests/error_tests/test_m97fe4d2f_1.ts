import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true on successful transfer and kill mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup test addresses and values
    const tos = [addr1.address, addr2.address];
    const values = [100, 200];

    // Call transfer function and capture the return value
    const tx = await instance.transfer(owner.address, addr1.address, tos, values);
    const receipt = await tx.wait();

    // Check that the transaction succeeded (no revert)
    expect(receipt.status).to.equal(1);

    // The key assertion: the function should return true
    // We need to call it again to check the return value directly
    const result = await instance.transfer.staticCall(owner.address, addr1.address, tos, values);
    expect(result).to.equal(true);
  });
});