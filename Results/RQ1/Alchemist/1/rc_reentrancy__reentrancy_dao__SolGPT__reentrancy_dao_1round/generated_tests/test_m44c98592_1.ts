import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should revert when withdrawAll is called from a contract that reverts on receive", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious contract that will revert when receiving ETH
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with ETH so it can deposit
    await attacker.sendTransaction({
      to: malicious.target,
      value: ethers.parseEther("1.0")
    });
    
    // Malicious contract deposits into DAO
    const depositTx = await malicious.connect(attacker).depositToDAO(dao.target);
    await depositTx.wait();
    
    // Malicious contract calls withdrawAll - should revert in original but might succeed in mutant
    await expect(
      malicious.connect(attacker).attack(dao.target)
    ).to.be.reverted;
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
  function depositToDAO(address daoAddress) external payable {
    // Deposit all ETH to DAO
    (bool success, ) = daoAddress.call{value: address(this).balance}(
      abi.encodeWithSignature("deposit()")
    );
    require(success);
  }
  
  function attack(address daoAddress) external {
    (bool success, ) = daoAddress.call(
      abi.encodeWithSignature("withdrawAll()")
    );
    require(success);
  }
  
  receive() external payable {
    revert("Malicious receiver - revert");
  }
}