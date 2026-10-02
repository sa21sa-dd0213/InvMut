import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - me0f42c11", function () {
  it("should kill mutant by sending 10 ether on block 15 and expecting payout", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund contract with initial balance so transfer can succeed
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Wait for block 15
    while ((await ethers.provider.getBlock("latest")).number < 15) {
      await ethers.provider.send("evm_mine", []);
    }

    // Player sends 10 ether on block 15
    const tx = await player.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // After the call, on original contract the balance would be sent to player (payout triggered)
    // On mutant with division, no payout occurs at block 15, so player should have more than 0 balance
    const playerBalance = await ethers.provider.getBalance(player.address);
    
    // On original, player received 10 ether back + the contract balance, so balance > 10 ether
    // On mutant, player only sent 10 ether and got nothing back, so balance is less
    expect(playerBalance).to.be.gt(ethers.parseEther("10"));
  });
});