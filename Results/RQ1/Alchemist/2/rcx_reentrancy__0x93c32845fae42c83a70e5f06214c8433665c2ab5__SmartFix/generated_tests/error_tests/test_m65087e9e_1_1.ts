import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m65087e9e test", function () {
  it("should revert when Collect fails but mutant silently continues", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a malicious contract that will reject ether transfers
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the X_WALLET with ether to allow Collect
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("10")
    });

    // Set unlock time to now (so we can collect immediately)
    // First put some funds from malicious contract to have a balance
    await malicious.connect(attacker).putFunds(await wallet.getAddress(), {
      value: ethers.parseEther("5")
    });

    // Now try to collect from the malicious contract
    // The malicious contract's receive() function will revert, causing the call to fail
    // Original contract should revert the entire transaction
    // Mutant should NOT revert (silently continue)
    await expect(
      wallet.connect(attacker).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
  function putFunds(address walletAddress) external payable {
    (bool success, ) = walletAddress.call{value: msg.value}(
      abi.encodeWithSignature("Put(uint256)", block.timestamp + 100)
    );
    require(success, "Put failed");
  }

  receive() external payable {
    revert("Rejecting ether");
  }
}