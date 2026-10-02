import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - m41929ad8", function () {
  it("should revert when Collect fails due to recipient contract rejecting ETH, but mutant silently succeeds", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a malicious contract that rejects ETH
    const Rejector = await ethers.getContractFactory("RejectingContract");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Deploy the PENNY_BY_PENNY contract
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (required for AddMessage)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFactory.deploy();
    await logFile.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();

    // Fund the attacker account with ETH
    await owner.sendTransaction({
      to: attacker.address,
      value: ethers.parseEther("10")
    });

    // Attacker deposits 2 ETH into the contract
    await instance.connect(attacker).Put(0, { value: ethers.parseEther("2") });

    // Attempt to collect using the rejecting contract as recipient
    // The original contract would revert; the mutant will not revert
    const tx = instance.connect(attacker).Collect(
      ethers.parseEther("1"),
      { to: await rejector.getAddress() }
    );

    // The mutant will NOT revert (fails test) while original would revert
    await expect(tx).to.be.reverted;
  });
});

// Helper contract that rejects all ETH transfers
contract RejectingContract {
  receive() external payable {
    revert("ETH rejected");
  }
}