import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mb654cc1c", function () {
  it("should revert on reentrant call to Put when nonReentrant_ modifier is present", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();

    // Deploy a malicious reentrancy contract
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const malicious = await MaliciousFactory.deploy(await wallet.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract with initial ETH
    await attacker.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1")
    });

    // Attack: calling attack() will trigger Put() via fallback reentrancy
    // In original contract with nonReentrant_, this should revert
    // In mutant without modifier, it would succeed (kill the mutant)
    await expect(
      malicious.connect(attacker).attack({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});

// Helper contract to test reentrancy (must be compiled alongside)
// This contract should be in a separate file (e.g., ReentrancyAttacker.sol)
/*
pragma solidity ^0.8.0;

interface IWallet {
    function Put(uint _unlockTime) external payable;
    function Collect(uint _am) external payable;
}

contract ReentrancyAttacker {
    IWallet public wallet;
    bool public attackStarted;

    constructor(address _wallet) {
        wallet = IWallet(_wallet);
    }

    function attack() external payable {
        attackStarted = true;
        wallet.Put{value: msg.value}(block.timestamp + 1);
    }

    receive() external payable {
        if (attackStarted) {
            attackStarted = false;
            // Reenter Put - this should revert if nonReentrant_ is present
            wallet.Put(block.timestamp + 1);
        }
    }
}
*/