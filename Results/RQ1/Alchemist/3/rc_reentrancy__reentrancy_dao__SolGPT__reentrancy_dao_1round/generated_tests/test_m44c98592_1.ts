import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44c98592", function () {
  it("should revert when withdrawAll is called from a contract that reverts on receive", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const DAOFactory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the malicious contract to make a deposit
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: depositAmount
    });
    
    // Attacker (malicious contract) deposits into DAO
    const maliciousAddress = await malicious.getAddress();
    await malicious.connect(owner).depositToDAO(await dao.getAddress(), { value: depositAmount });
    
    // Verify deposit was recorded
    expect(await dao.credit(maliciousAddress)).to.equal(depositAmount);
    
    // Attempt withdrawal - should revert in original, succeed (incorrectly) in mutant
    await expect(
      malicious.connect(owner).attack(await dao.getAddress())
    ).to.be.reverted;
    
    // Verify state is unchanged (original behavior)
    expect(await dao.credit(maliciousAddress)).to.equal(depositAmount);
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
    function depositToDAO(address daoAddress) external payable {
        (bool success, ) = daoAddress.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(success);
    }
    
    function attack(address daoAddress) external {
        (bool success, ) = daoAddress.call(abi.encodeWithSignature("withdrawAll()"));
        require(success);
    }
    
    receive() external payable {
        revert("I refuse to accept ETH");
    }
}