import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant mb654cc1c - missing nonReentrant_ modifier on Put", function () {
  it("should revert on reentrancy attempt in original but succeed in mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy a malicious contract that will attempt reentrancy via fallback
    const MaliciousFactory = await ethers.getContractFactory("contract MaliciousReentrancy { W_WALLET target; constructor(address _target) { target = W_WALLET(_target); } fallback() external payable { if (address(target).balance >= 1 ether) { target.Put(0); } } function attack() external payable { target.Put{value: msg.value}(0); } }");
    const malicious = await MaliciousFactory.deploy(await wallet.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with some ETH
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Attempt the attack: call Put on the wallet through the malicious contract
    // The original contract would revert due to nonReentrant_ lock
    // The mutant would allow reentrancy and succeed
    const tx = malicious.connect(attacker).attack({ value: ethers.parseEther("0.5") });
    
    // In the original contract this would revert, in the mutant it succeeds
    // We expect the transaction to succeed (mutant behavior)
    await expect(tx).to.not.be.reverted;
    
    // Verify that the reentrancy happened (balance increased more than expected)
    const attackerBalance = await wallet.Acc(await malicious.getAddress());
    expect(attackerBalance.balance).to.be.gt(ethers.parseEther("0.5"));
  });
});