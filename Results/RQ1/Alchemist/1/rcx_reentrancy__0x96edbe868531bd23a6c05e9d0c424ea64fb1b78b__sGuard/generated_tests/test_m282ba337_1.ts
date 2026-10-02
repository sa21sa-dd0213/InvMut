import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - SetMinSum reentrancy", function () {
  it("should revert when SetMinSum is called during reentrancy on original, but not on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await PennyFactory.deploy();
    await instance.waitForDeployment();
    
    // Set up the log file
    await instance.connect(owner).SetLogFile(await log.getAddress());
    
    // Initialized must be called to prevent SetMinSum from reverting
    await instance.connect(owner).Initialized();
    
    // Deploy a malicious contract that will reenter SetMinSum
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with ETH
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attack: call Put with lock time via fallback to trigger reentrancy
    // The malicious contract's receive/fallback will call SetMinSum
    await expect(
      malicious.connect(attacker).attack({ value: ethers.parseEther("0.1") })
    ).to.be.reverted; // This should pass on original (revert), fail on mutant (no revert)
  });
});

// Helper contract to trigger reentrancy
contract ReentrancyAttacker {
  address private target;
  
  constructor(address _target) {
    target = _target;
  }
  
  function attack() external payable {
    // This call to Put will trigger fallback which calls Put again
    // We use a self-call to create reentrancy
    (bool success, ) = target.call{value: msg.value}(abi.encodeWithSignature("Put(uint256)", 0));
    require(success, "Put failed");
  }
  
  fallback() external payable {
    // Reenter SetMinSum
    (bool success, ) = target.call(abi.encodeWithSignature("SetMinSum(uint256)", 100));
    require(success, "SetMinSum reentry failed");
  }
}