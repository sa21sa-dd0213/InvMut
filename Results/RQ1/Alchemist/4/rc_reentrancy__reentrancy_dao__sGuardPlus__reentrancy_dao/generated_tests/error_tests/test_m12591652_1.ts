import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - reentrancy guard removal", function () {
  it("should prevent reentrancy attack on withdrawAll with lock modifier", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const ReentrancyDAO = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await ReentrancyDAO.deploy();
    await dao.waitForDeployment();
    
    // Deploy a malicious attacker contract that will attempt reentrancy
    const AttackerContract = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerContract.deploy(await dao.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the DAO with some ETH
    await owner.sendTransaction({
      to: await dao.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attacker deposits to get credit in the DAO
    await attackerContract.connect(attacker).deposit({ value: ethers.parseEther("0.5") });
    
    // Verify initial state
    const initialBalance = await ethers.provider.getBalance(await dao.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1.5"));
    
    // Attacker calls withdrawAll - if reentrancy guard is missing, 
    // the attacker can drain more than their credit
    const tx = attackerContract.connect(attacker).attack();
    
    // If the lock modifier is present (original), the attack should fail
    // If the lock modifier is removed (mutant), the attack might succeed
    await expect(tx).to.be.reverted;
    
    // Verify that the attacker could not drain more than their credit
    const finalBalance = await ethers.provider.getBalance(await dao.getAddress());
    expect(finalBalance).to.equal(ethers.parseEther("1.0")); // Only owner's 1 ETH remains
  });
});

// Helper contract to execute reentrancy attack
// Note: This must be compiled and deployed alongside the test
contract ReentrancyAttacker {
    ReentrancyDAO public dao;
    bool public attackInProgress;
    
    constructor(address _dao) {
        dao = ReentrancyDAO(_dao);
        attackInProgress = false;
    }
    
    function deposit() external payable {
        dao.deposit{value: msg.value}();
    }
    
    function attack() external {
        attackInProgress = true;
        dao.withdrawAll();
        attackInProgress = false;
    }
    
    receive() external payable {
        if (attackInProgress) {
            // Try to re-enter and drain more funds
            dao.withdrawAll();
        }
    }
}