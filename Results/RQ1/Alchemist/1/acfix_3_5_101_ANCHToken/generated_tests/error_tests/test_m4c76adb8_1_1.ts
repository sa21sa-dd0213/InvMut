import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m4c76adb8 detection test", function () {
  it("should NOT distribute reward for transfer below minTxnAmount from allowed role (kills <= mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the actual ANCHToken with proper constructor args
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const token = await ANCHToken.deploy(
      ethers.ZeroAddress, // router address
      ethers.ZeroAddress  // USD token address
    );
    await token.waitForDeployment();

    // Get initial balances and state
    const minTxnAmount = await token.minTxnAmount();
    const smallTransferAmount = minTxnAmount - ethers.parseEther("1");

    // Transfer some tokens to the contract for rewards
    await token.transfer(await token.getAddress(), ethers.parseEther("1000"));

    // Record initial txReward for recipient
    const initialReward = await token.txReward(addr1.address);

    // Perform a transfer below minTxnAmount from owner to addr1
    await token.connect(owner).transfer(addr1.address, smallTransferAmount);

    // Check that NO reward was given (should be 0)
    const finalReward = await token.txReward(addr1.address);

    // In the original, reward is NOT given for transfers below minTxnAmount
    // In the mutant with <=, reward WOULD be given for transfers below minTxnAmount
    // Therefore, this assertion kills the mutant
    expect(finalReward).to.equal(initialReward);

    // Also verify the contract balance hasn't decreased from rewards
    const contractBalance = await token.balanceOf(await token.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1000"));
  });
});