import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m6b07bfe7 - transferFrom balance check", function () {
  it("should revert when transferFrom amount exceeds from balance (original behavior), but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: give addr1 some tokens via distr (calling getTokens which distributes tokens)
    // First, ensure distribution is not finished and addr1 is not blacklisted
    // Send ether to trigger getTokens
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now addr1 has tokens, let's approve owner to spend from addr1
    // Get addr1's balance first
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    expect(balanceAddr1).to.be.gt(0);

    // Approve owner to spend addr1's tokens
    await instance.connect(addr1).approve(owner.address, balanceAddr1);

    // Attempt transferFrom with amount exceeding addr1's balance
    // Original requires(_amount <= balances[_from]) would revert
    // Mutant without this check should not revert
    const excessAmount = balanceAddr1 + BigInt(1);
    
    // This should revert on original (require check present), but pass on mutant (check removed)
    await expect(
      instance.connect(owner).transferFrom(addr1.address, addr2.address, excessAmount)
    ).to.be.reverted;
  });
});