import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant test - m333425f9", function () {
  it("should kill mutant by checking that Collect reverts when transfer fails and no log is added", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy LogFile first (it has no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy ACCURAL_DEPOSIT with the LogFile address
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set the LogFile address (owner calls SetLogFile before initialization)
    await instance.connect(owner).SetLogFile(await logFile.getAddress());

    // Set MinSum to 0 to make collecting easier
    await instance.connect(owner).SetMinSum(0);

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Deploy a malicious contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the rejector contract so it has balance to call Collect
    await owner.sendTransaction({
      to: await rejector.getAddress(),
      value: ethers.parseEther("10")
    });

    // Have the rejector deposit some Ether into ACCURAL_DEPOSIT
    await rejector.connect(owner).deposit(await instance.getAddress(), { value: ethers.parseEther("5") });

    // Get initial history length
    const initialHistoryLength = await logFile.History.length;

    // Now have the rejector attempt to collect - this should revert because the rejector rejects Ether
    await expect(
      rejector.connect(owner).collect(await instance.getAddress(), ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify no new log entry was added (mutant would have added one despite revert)
    const finalHistoryLength = await logFile.History.length;
    expect(finalHistoryLength).to.equal(initialHistoryLength);
  });
});

// Helper contract that rejects incoming Ether
contract Rejector {
  function deposit(address accuralDeposit) external payable {
    (bool success, ) = accuralDeposit.call{value: msg.value}("");
    require(success, "Deposit failed");
  }

  function collect(address accuralDeposit, uint256 amount) external {
    (bool success, ) = accuralDeposit.call(
      abi.encodeWithSignature("Collect(uint256)", amount)
    );
    require(success, "Collect failed");
  }

  receive() external payable {
    revert("I reject Ether");
  }
}