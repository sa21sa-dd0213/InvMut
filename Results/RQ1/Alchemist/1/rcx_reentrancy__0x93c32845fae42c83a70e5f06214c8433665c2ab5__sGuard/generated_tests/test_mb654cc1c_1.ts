import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - mb654cc1c", function () {
  it("should detect missing nonReentrant_ modifier on Put by performing a reentrant attack via fallback during Collect", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Fund the attacker with some ETH
    await owner.sendTransaction({
      to: await attacker.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Attacker puts 5 ETH into the wallet with unlock time = current timestamp (immediately available)
    await wallet.connect(attacker).Put(
      (await ethers.provider.getBlock("latest")).timestamp,
      { value: ethers.parseEther("5") }
    );
    
    // Deploy a malicious contract that will re-enter Put during Collect
    const MaliciousFactory = await ethers.getContractFactory(
      "contract Malicious { " +
      "  X_WALLET target; " +
      "  constructor(address _target) { target = X_WALLET(_target); } " +
      "  receive() external payable { " +
      "    if (address(target).balance > 0) { " +
      "      target.Put(block.timestamp); " +
      "    } " +
      "  } " +
      "  function attack() external payable { " +
      "    target.Collect{value: 0}(address(this).balance); " +
      "  } " +
      "} " +
      "interface X_WALLET { " +
      "  function Put(uint _unlockTime) external payable; " +
      "  function Collect(uint _am) external payable; " +
      "}"
    );
    const malicious = await MaliciousFactory.deploy(await wallet.getAddress());
    await malicious.waitForDeployment();
    
    // Fund malicious contract with 1 ETH
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Malicious contract puts 1 ETH into wallet (to have balance to collect)
    await malicious.connect(attacker).Put(
      (await ethers.provider.getBlock("latest")).timestamp,
      { value: ethers.parseEther("1") }
    );
    
    // Now attempt the reentrancy attack - this should revert on original (nonReentrant)
    // but succeed on the mutant (missing nonReentrant)
    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted; // If it does NOT revert, the mutant is alive (vulnerable)
    
    // Additional assertion: In original, attacker's balance should remain unchanged
    // In mutant, attacker could have drained more funds
    const attackerBalance = await ethers.provider.getBalance(await attacker.getAddress());
    expect(attackerBalance).to.be.closeTo(
      ethers.parseEther("4"), // initial 10 - 5 (put) - 1 (fund malicious) = 4 ETH
      ethers.parseEther("0.1")
    );
  });
});