import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m8cfd4b61 test", function () {
  it("should emit Redeemed event when logRedeemed is called by an approved logger", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);

    const txid = ethers.keccak256(ethers.toUtf8Bytes("test_transaction"));

    // Get the current block timestamp before the transaction
    const block = await ethers.provider.getBlock("latest");
    const timestamp = block?.timestamp ?? 0;

    // Call logRedeemed and expect the Redeemed event
    await expect(instance.connect(approvedLogger).logRedeemed(txid))
      .to.emit(instance, "Redeemed")
      .withArgs(approvedLogger.address, txid, timestamp);
  });
});