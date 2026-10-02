import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mab2733d2", function () {
  it("should revert when external call fails (mutant removed require)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so it has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get the hardcoded target from the contract
    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";

    // Set the target address to be a contract that reverts on receive
    // This bytecode represents a simple contract that reverts on any call
    const revertBytecode = "0x60806040526004361060255760003560e01c80633ccfd60b1460275760015b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600a602482015269139bdd08185b1b1bddd95960b21b6044820152606490fd5b005b600080fdfea2646970667358221220a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a64736f6c63430008120033";
    await ethers.provider.send("hardhat_setCode", [targetAddress, revertBytecode]);

    // Now the target will revert on any call
    const contractAddress = await instance.getAddress();
    const balanceBefore = await ethers.provider.getBalance(contractAddress);

    // Call go() - should revert because the external call fails
    await expect(
      instance.connect(owner).go({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;

    // Verify contract still has its balance (no transfer happened)
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter).to.equal(balanceBefore);

    // Cleanup: restore original code at target address
    await ethers.provider.send("hardhat_setCode", [targetAddress, "0x"]);
  });
});