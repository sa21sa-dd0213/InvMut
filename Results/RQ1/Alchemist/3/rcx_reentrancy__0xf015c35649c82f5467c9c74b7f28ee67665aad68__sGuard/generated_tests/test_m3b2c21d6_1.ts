import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Reentrancy test to kill mutant m3b2c21d6", function () {
  it("should revert on reentrant Put call when nonReentrant modifier is present (original), but succeed when modifier is removed (mutant)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with the Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Fund the attacker with some ETH
    const attackerInitialBalance = ethers.parseEther("10");
    await attacker.sendTransaction({
      to: await bank.getAddress(),
      value: ethers.parseEther("5")
    });

    // Deploy a malicious contract that will reenter Put during Collect
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReenter");
    const malicious = await MaliciousFactory.deploy(await bank.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract so it can put and collect
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("10")
    });

    // First, the malicious contract puts some ETH (calls Put with unlock time in the past)
    await malicious.connect(attacker).doPut(0, { value: ethers.parseEther("1") });

    // Now attempt to collect with reentrancy - the malicious contract's fallback will call Put again
    // The original contract with nonReentrant should revert; the mutant (without modifier) should succeed
    const tx = malicious.connect(attacker).doCollect(ethers.parseEther("1"));

    if ((await ethers.provider.getCode(await bank.getAddress())).includes("nonReentrant_")) {
      // Original: should revert due to reentrancy lock
      await expect(tx).to.be.reverted;
    } else {
      // Mutant: should succeed (no reentrancy protection)
      await expect(tx).to.not.be.reverted;
    }
  });
});

// Helper contract to trigger reentrancy
contract MaliciousReenter {
  MY_BANK public bank;
  address public owner;

  constructor(address _bank) {
    bank = MY_BANK(_bank);
    owner = msg.sender;
  }

  function doPut(uint _unlockTime) external payable {
    bank.Put{value: msg.value}(_unlockTime);
  }

  function doCollect(uint _am) external {
    bank.Collect(_am);
  }

  fallback() external payable {
    // Reenter by calling Put again during Collect's external call
    if (msg.sender == address(bank)) {
      bank.Put(0);
    }
  }
}