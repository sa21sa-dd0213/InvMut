import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m7b951c4f test", function () {
  it("should kill mutant by checking distributionFinished after totalDistributed equals totalSupply", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial values
    const totalSupply = await instance.totalSupply();
    const totalDistributed = await instance.totalDistributed();

    // Calculate remaining to distribute to reach exactly totalSupply
    const remainingToReachSupply = totalSupply - totalDistributed;

    // The value per getTokens() call is initially 2500e18 wei
    const valuePerCall = await instance.value();

    // Calculate how many calls needed to reach totalSupply
    // We need to distribute remainingToReachSupply tokens
    // Each call distributes valuePerCall tokens
    const callsNeeded = remainingToReachSupply / valuePerCall;

    // Perform calls to get to exactly totalSupply
    for (let i = 0; i < callsNeeded.toNumber() - 1; i++) {
      await instance.connect(addr1).getTokens({ value: ethers.parseEther("0.1") });
      // Transfer tokens to a new address to avoid blacklist
      const tokensToTransfer = await instance.balanceOf(addr1.address);
      await instance.connect(addr1).transfer(addr2.address, tokensToTransfer);
    }

    // Last call to reach exactly totalSupply
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("0.1") });

    // Check distributionFinished - on original it should be true, on mutant it should be false
    const isFinished = await instance.distributionFinished();

    // On the original contract, distributionFinished should be true
    // On the mutant, the condition totalDistributed > totalSupply is false (they are equal),
    // so distributionFinished remains false - this assertion kills the mutant
    expect(isFinished).to.equal(true);
  });
});