import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ReentrancyDAO mutant test - m44c98592", function () {
  it("should revert when withdrawAll is called by a contract that reverts on receiving ether", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const DAOFactory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious contract that will revert on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReverter");
    const malicious = await MaliciousFactory.deploy(await dao.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the DAO first via the malicious contract
    const depositAmount = ethers.parseEther("1.0");
    await malicious.deposit({ value: depositAmount });
    
    // Verify balance was credited
    expect(await dao.credit(await malicious.getAddress())).to.equal(depositAmount);
    
    // Call withdrawAll from the malicious contract - should revert because the call fails
    await expect(malicious.attack()).to.be.reverted;
    
    // Verify state was not changed (if require was removed, balance would be zero)
    expect(await dao.credit(await malicious.getAddress())).to.equal(depositAmount);
    expect(await dao.balance()).to.equal(depositAmount);
  });
});

// Helper contract to simulate a failed call
contract MaliciousReverter {
    ReentrancyDAO dao;
    
    constructor(address _dao) {
        dao = ReentrancyDAO(_dao);
    }
    
    function deposit() external payable {
        dao.deposit{value: msg.value}();
    }
    
    function attack() external {
        dao.withdrawAll();
    }
    
    receive() external payable {
        revert("I refuse to accept ether");
    }
}