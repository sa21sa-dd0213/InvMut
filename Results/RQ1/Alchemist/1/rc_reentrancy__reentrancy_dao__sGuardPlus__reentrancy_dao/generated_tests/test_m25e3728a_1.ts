import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - m25e3728a", function () {
  it("should revert when external call fails in withdrawAll (require removed)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Deploy a malicious contract that will reject incoming ether
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReject");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the attacker's account
    await owner.sendTransaction({
      to: attacker.address,
      value: ethers.parseEther("10")
    });

    // Attacker deposits ether to the DAO from the malicious contract
    await malicious.connect(attacker).depositToDAO(dao.target, { value: ethers.parseEther("5") });

    // Check that credit was recorded
    expect(await dao.credit(malicious.target)).to.equal(ethers.parseEther("5"));

    // Attempt to withdrawAll - should revert on original, but mutant might succeed
    // The malicious contract's receive function will revert
    await expect(
      malicious.connect(attacker).attackWithdraw(dao.target)
    ).to.be.reverted;

    // Verify that the credit is still intact (not zeroed out) since the call reverted
    expect(await dao.credit(malicious.target)).to.equal(ethers.parseEther("5"));
  });
});

// Helper contract to reject ether and perform attack
// This contract must be deployed separately or defined in a separate file
// For testing purposes, we assume it exists
contract MaliciousReject {
    function depositToDAO(address dao) external payable {
        (bool success, ) = dao.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(success, "deposit failed");
    }
    
    function attackWithdraw(address dao) external {
        (bool success, ) = dao.call(abi.encodeWithSignature("withdrawAll()"));
        require(success, "withdraw failed");
    }
    
    receive() external payable {
        revert("I reject your ether!");
    }
}