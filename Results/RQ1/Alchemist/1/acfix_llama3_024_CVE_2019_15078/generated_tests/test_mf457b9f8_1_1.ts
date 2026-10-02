import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - Transfer event emission", function () {
  it("should emit Transfer event when transfer is called, and fail on mutant that removes the event", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances for owner and addr1
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const transferAmount = ethers.parseEther("100");

    // Perform transfer
    const tx = await instance.transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();

    // Verify the Transfer event was emitted with correct parameters
    const transferEvent = receipt.logs.find(
      (log: any) => {
        try {
          const parsedLog = instance.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          return parsedLog?.name === "Transfer";
        } catch {
          return false;
        }
      }
    );

    // Parse the event to verify parameters
    const parsedEvent = instance.interface.parseLog({
      topics: transferEvent!.topics as string[],
      data: transferEvent!.data
    });

    expect(parsedEvent?.name).to.equal("Transfer");
    expect(parsedEvent?.args.from).to.equal(owner.address);
    expect(parsedEvent?.args.to).to.equal(addr1.address);
    expect(parsedEvent?.args.value).to.equal(transferAmount);

    // Verify state changes still occurred
    const finalOwnerBalance = await instance.balanceOf(owner.address);
    const finalAddr1Balance = await instance.balanceOf(addr1.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount);
    expect(finalAddr1Balance).to.equal(transferAmount);
  });
});