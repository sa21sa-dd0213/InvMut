import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m7883561d test", function () {
  it("should revert when calling play() in the same block as wager()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = addr1.address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to a value that ensures winningNumber != difficulty/2
    await instance.connect(owner).AdjustDifficulty(10);

    // Fund the contract so it has balance for potential payouts
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // addr1 calls wager() with exact betLimit
    await instance.connect(addr1).wager({ value: betLimit });

    // Immediately try to call play() in the same block - should revert
    await expect(
      instance.connect(addr1).play()
    ).to.be.reverted;
  });
});