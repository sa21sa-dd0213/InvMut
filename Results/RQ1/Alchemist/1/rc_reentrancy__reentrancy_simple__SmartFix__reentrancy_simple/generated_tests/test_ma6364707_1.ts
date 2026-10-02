import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant ma6364707 test", function () {
  it("should revert when withdrawBalance() is called by a contract that reverts on receive", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();
    
    // Deploy a malicious attacker contract that will revert on receive
    const AttackerFactory = await ethers.getContractFactory("contract Attacker { address target; constructor(address _target) { target = _target; } function attack() external payable { target.call{value: msg.value}(abi.encodeWithSignature(\"addToBalance()\")); target.call(abi.encodeWithSignature(\"withdrawBalance()\")); } receive() external payable { revert(\"revert\"); } }");
    const attackerContract = await AttackerFactory.deploy(await reentrance.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the attacker contract with ETH
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Add balance to the Reentrance contract for the attacker contract
    await reentrance.connect(attacker).addToBalance({ value: ethers.parseEther("0.5") });
    
    // The attacker contract calls withdrawBalance() - in original it reverts, in mutant it succeeds incorrectly
    // We expect revert in original, so this should revert
    await expect(
      attackerContract.connect(attacker).attack()
    ).to.be.reverted;
    
    // Additional check: balance should still be 0.5 ETH if revert happened
    const balance = await reentrance.getBalance(await attackerContract.getAddress());
    expect(balance).to.equal(ethers.parseEther("0.5"));
  });
});