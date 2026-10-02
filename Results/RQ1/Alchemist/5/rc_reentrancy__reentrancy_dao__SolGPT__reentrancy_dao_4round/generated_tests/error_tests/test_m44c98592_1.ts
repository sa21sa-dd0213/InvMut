import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should detect removal of require(callResult) by calling withdrawAll from a contract that reverts on receive", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious contract that will revert on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with ETH via deposit
    await dao.connect(malicious).deposit({ value: ethers.parseEther("1.0") });
    
    // Verify initial state
    expect(await dao.connect(malicious).credit(malicious.target)).to.equal(ethers.parseEther("1.0"));
    
    // Attempt to withdrawAll - should revert in original but succeed in mutant
    // The mutant will not check the call result, so it will proceed even though the call fails
    await dao.connect(malicious).withdrawAll();
    
    // In the mutant, the credit is set to 0 and balance is reduced even though ETH was not sent
    // This leaves the contract in an inconsistent state that we can detect
    expect(await dao.connect(malicious).credit(malicious.target)).to.equal(0);
    expect(await ethers.provider.getBalance(dao.target)).to.equal(0);
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
  receive() external payable {
    revert("Cannot receive ETH");
  }
  
  function deposit(address dao) external payable {
    (bool success, ) = dao.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
    require(success);
  }
  
  function withdrawAll(address dao) external {
    (bool success, ) = dao.call(abi.encodeWithSignature("withdrawAll()"));
    require(success);
  }
}