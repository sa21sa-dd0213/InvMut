import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - pot accumulation", function () {
  it("should detect mutant by checking pot equals contract balance after multiple plays", async function () {
    const [owner, player] = await ethers.getSigners();
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Play the lottery twice to accumulate pot
    const tx1 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx1.wait();
    const tx2 = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx2.wait();

    // Get the contract's actual balance
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // Get the reported pot from the contract
    const reportedPot = await instance.pot();

    // The pot should equal the contract balance if no game was won
    // (mutant subtracts 1 wei per play from pot accumulation)
    expect(reportedPot).to.equal(contractBalance);
  });
});