import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m30571364 test", function () {
  it("should detect missing nonReentrant modifier on Initialized by calling it during reentrant Put", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the PENNY_BY_PENNY contract
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttack");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Set MinSum to allow Collect
    await instance.SetMinSum(ethers.parseEther("0.1"));
    await instance.Initialized();
    
    // Call Put from malicious contract to trigger fallback -> reentrancy
    await expect(
      malicious.connect(attacker).attack({
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;
  });
});

// Helper contract for reentrancy attack
contract ReentrancyAttack {
  address target;
  constructor(address _target) {
    target = _target;
  }
  
  function attack() external payable {
    PENNY_BY_PENNY(target).Put{value: msg.value}(0);
  }
  
  fallback() external payable {
    // Try to call Initialized during reentrancy
    PENNY_BY_PENNY(target).Initialized();
  }
}