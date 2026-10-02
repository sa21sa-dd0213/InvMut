import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mf541e33c test", function () {
  it("should revert when transferring exact full balance via transferFrom (mutant kills this case)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Give addr1 some tokens via distr (by calling getTokens after sending ether)
    // First, ensure distribution is not finished
    await instance.connect(owner).NETM();
    
    // Send ether to trigger getTokens which distributes tokens
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // Get addr1's balance
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    
    // Owner approves addr2 to spend addr1's full balance
    await instance.connect(addr1).approve(addr2.address, balanceAddr1);

    // This should succeed on original (<=) but fail on mutant (<)
    // because the mutant requires _amount < balances[_from]
    await expect(
      instance.connect(addr2).transferFrom(addr1.address, addr2.address, balanceAddr1)
    ).to.be.reverted;
  });
});