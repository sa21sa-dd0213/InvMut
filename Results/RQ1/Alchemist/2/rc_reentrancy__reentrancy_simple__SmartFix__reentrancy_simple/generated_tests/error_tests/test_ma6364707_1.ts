import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - ma6364707", function () {
  it("should revert when withdrawBalance is called by a contract that reverts on receive", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the Reentrance contract (no constructor arguments needed)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();

    // Deploy a malicious receiver contract that always reverts on receive
    const MaliciousReceiver = await ethers.getContractFactory(
      "contracts/MaliciousReceiver.sol:MaliciousReceiver"
    );
    const malicious = await MaliciousReceiver.deploy();
    await malicious.waitForDeployment();

    // Fund the malicious contract with some ether so it can call withdrawBalance
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Add balance for the malicious contract in Reentrance
    const addTx = await reentrance.connect(malicious).addToBalance({
      value: ethers.parseEther("0.5"),
    });
    await addTx.wait();

    // Verify balance is set
    expect(await reentrance.getBalance(await malicious.getAddress())).to.equal(
      ethers.parseEther("0.5")
    );

    // Attempt withdrawal - should revert because the receiver (malicious) reverts on receive
    // The original contract would revert, the mutant would not
    await expect(
      reentrance.connect(malicious).withdrawBalance()
    ).to.be.reverted;
  });
});