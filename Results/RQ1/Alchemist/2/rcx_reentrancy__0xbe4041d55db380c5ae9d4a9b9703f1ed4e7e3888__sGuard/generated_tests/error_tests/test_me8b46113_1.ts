import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant me8b46113 test", function () {
  it("should revert on reentrant call to SetLogFile due to nonReentrant modifier", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed for SetLogFile)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MONEY_BOX
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrant");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // First call SetLogFile normally - should succeed
    await instance.connect(owner).SetLogFile(await log.getAddress());
    
    // Now trigger reentrancy through the malicious contract
    // The malicious contract's fallback will call SetLogFile again
    await expect(
      malicious.connect(owner).attack(await log.getAddress())
    ).to.be.reverted;
  });
});

// Helper contract to test reentrancy
contract MaliciousReentrant {
    address public target;
    
    constructor(address _target) {
        target = _target;
    }
    
    function attack(address _log) external {
        // Call SetLogFile - this will trigger fallback which calls SetLogFile again
        (bool success, ) = target.call(abi.encodeWithSignature("SetLogFile(address)", _log));
        require(success, "First call failed");
    }
    
    fallback() external payable {
        // Reentrant call - should fail on original but succeed on mutant
        (bool success, ) = target.call(abi.encodeWithSignature("SetLogFile(address)", msg.sender));
        require(success, "Reentrant call should revert");
    }
}