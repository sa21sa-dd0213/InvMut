import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - m5ff81f3c", function () {
  it("should detect the mutant that changes >= to > for MinSum check", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));

    // Initialize the contract (required before Put/Collect)
    await instance.Initialized();

    // Set up a Log contract so Collect doesn't revert on LogFile.AddMessage
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    // User puts exactly 1 ether with lock time 0 (immediately collectable)
    const putTx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1"),
      data: "0x"
    });
    await putTx.wait();

    // Now user's balance == MinSum == 1 ether
    // Original contract allows Collect with amount = 1 ether (balance >= MinSum)
    // Mutant rejects because balance > MinSum is false (1 > 1 is false)
    const collectTx = instance.connect(user).Collect(ethers.parseEther("1"));

    // On the mutant this should revert; on the original it should succeed
    // Since we're testing the mutant, we expect revert
    await expect(collectTx).to.be.reverted;
  });
});