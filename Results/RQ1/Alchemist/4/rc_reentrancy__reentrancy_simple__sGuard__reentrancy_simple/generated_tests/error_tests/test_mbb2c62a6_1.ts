import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbb2c62a6 test", function () {
  it("should detect missing nonReentrant modifier via reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();
    const reentranceAddress = await reentrance.getAddress();

    // Deploy the attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(reentranceAddress);
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with initial ETH
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: fundAmount
    });

    // Attacker contract deposits into Reentrance
    const depositTx = await attackerContract.connect(attacker).deposit({ value: fundAmount });
    await depositTx.wait();

    // Verify attacker's balance in Reentrance
    const balanceBefore = await reentrance.getBalance(await attackerContract.getAddress());
    expect(balanceBefore).to.equal(fundAmount);

    // Perform the reentrancy attack - this should succeed on the mutant but fail on original
    const attackTx = attackerContract.connect(attacker).attack({ gasLimit: 500000 });
    
    // On the mutant (missing nonReentrant), this should succeed and drain more funds
    await expect(attackTx).to.not.be.reverted;
    
    // Verify the attacker contract drained more than its original balance
    const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerBalance).to.be.gt(fundAmount);
    
    // Verify Reentrance contract has been drained
    const reentranceBalance = await ethers.provider.getBalance(reentranceAddress);
    expect(reentranceBalance).to.equal(0);
  });
});

// Simple reentrancy attacker contract
contract ReentrancyAttacker {
    Reentrance public target;
    uint public attackCount;
    
    constructor(address _target) {
        target = Reentrance(_target);
    }
    
    function deposit() external payable {
        target.addToBalance{value: msg.value}();
    }
    
    function attack() external {
        target.withdrawBalance();
    }
    
    receive() external payable {
        if (attackCount < 5 && address(target).balance >= msg.value) {
            attackCount++;
            target.withdrawBalance();
        }
    }
}

// Interface for the Reentrance contract
interface Reentrance {
    function getBalance(address) external view returns (uint);
    function addToBalance() external payable;
    function withdrawBalance() external;
}