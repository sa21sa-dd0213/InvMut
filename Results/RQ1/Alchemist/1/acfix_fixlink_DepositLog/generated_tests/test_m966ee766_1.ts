import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - m966ee766", function () {
  it("should emit Created event when logCreated is called by an approved logger", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);

    // Call logCreated and capture the transaction
    const keepAddress = ethers.ZeroAddress;
    const tx = await instance.connect(addr1).logCreated(keepAddress);
    const receipt = await tx.wait();

    // Check that the Created event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Created")
      .withArgs(addr1.address, keepAddress, receipt!.blockTimestamp);
  });
});