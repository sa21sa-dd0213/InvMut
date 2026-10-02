import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1bb503c1 by depositing 1 wei and expecting success (original behavior), but mutant assertion will revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit exactly 1 wei
    const tx = await instance.connect(owner).deposit({ value: ethers.parseEther("1") });
    
    // The original contract accepts this deposit.
    // The mutant's assertion becomes: balances[msg.sender] + 1e18 - 1 > balances[msg.sender]
    // which simplifies to: 1e18 - 1 > 0, which is true, so this would pass on the mutant.
    // We need a deposit of exactly 1 wei to trigger the failure:
    const tx2 = await instance.connect(owner).deposit({ value: 1 });
    
    // The original contract accepts 1 wei deposit (assertion: 0 + 1 > 0 => true)
    // The mutant assertion becomes: 0 + 1 - 1 > 0 => 0 > 0 => false, causing revert
    await expect(tx2).to.be.reverted;
  });
});