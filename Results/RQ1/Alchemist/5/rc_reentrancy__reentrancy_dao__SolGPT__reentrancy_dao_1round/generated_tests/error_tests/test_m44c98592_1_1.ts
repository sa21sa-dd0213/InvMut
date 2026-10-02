import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m44c98592", function () {
  it("should revert when external call fails in original, but mutant would not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a malicious receiver that always reverts
    const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousContract = await MaliciousReceiver.deploy();
    await maliciousContract.waitForDeployment();

    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Fund the DAO contract with ETH
    await owner.sendTransaction({
      to: await dao.getAddress(),
      value: ethers.parseEther("10")
    });

    // Deposit ETH from the malicious contract into the DAO
    await maliciousContract.connect(attacker).depositToDAO(await dao.getAddress(), {
      value: ethers.parseEther("1")
    });

    // Get initial state
    const initialBalance = await ethers.provider.getBalance(await dao.getAddress());
    const maliciousAddress = await maliciousContract.getAddress();

    // Try to withdrawAll from the malicious contract - this should revert in original
    // but the mutant will not revert
    await expect(
      maliciousContract.connect(attacker).attack(await dao.getAddress())
    ).to.be.reverted;

    // Verify state remains unchanged (credit not zeroed, balance not decreased)
    // If mutant is live, this assertion would fail because state was modified
    const finalBalance = await ethers.provider.getBalance(await dao.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});

// Helper contract that always reverts on receive
contract MaliciousReceiver {
  function depositToDAO(address daoAddress) external payable {
    (bool success, ) = daoAddress.call{value: msg.value}("");
    require(success, "Deposit failed");
  }

  function attack(address daoAddress) external {
    (bool success, ) = daoAddress.call(
      abi.encodeWithSignature("withdrawAll()")
    );
    // Don't revert on our side, let the DAO handle it
    require(success, "Attack failed");
  }

  receive() external payable {
    revert("Malicious receiver - always revert");
  }
}