import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m58a63c87 detection", function () {
  it("should detect mutant using pre-Merge EVM where block.difficulty != block.prevrandao", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Get initial balances
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Play once
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();

    // Get final balances
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    const finalPlayerBalance = await ethers.provider.getBalance(player.address);

    // Calculate net changes
    const ownerChange = finalOwnerBalance - initialOwnerBalance;
    const playerChange = finalPlayerBalance - initialPlayerBalance;

    // Run multiple times to detect the deterministic behavior of mutant
    let playerAlwaysGotRefund = true;

    for (let i = 0; i < 5; i++) {
      const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await tx2.wait();

      const playerBal = await ethers.provider.getBalance(player.address);
      // In mutant, player always ends up with net loss of exactly 1 ETH (fee)
      // In original, player sometimes loses 10 ETH (net -10) and sometimes loses 1 ETH (net -1)
      const expectedMutantBalance = initialPlayerBalance - BigInt(i + 1) * FEE_AMOUNT;

      if (playerBal < expectedMutantBalance - ethers.parseEther("1")) {
        playerAlwaysGotRefund = false;
        break;
      }
    }

    // If player always got refund (never lost more than 1 ETH per play),
    // that's the mutant behavior (random always 0)
    expect(playerAlwaysGotRefund).to.be.false;
  });
});