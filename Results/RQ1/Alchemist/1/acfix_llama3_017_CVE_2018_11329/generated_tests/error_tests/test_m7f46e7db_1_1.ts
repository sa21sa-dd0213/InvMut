import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m7f46e7db", function () {
  it("should kill the mutant by sending 1 wei to buyDrugs() and expecting no revert, while the mutant would revert due to underflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, seed the market to initialize the contract
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("10") });

    // Now send exactly 1 wei to buyDrugs()
    // In the original: SafeMath.sub(address(this).balance, msg.value) = sub(balance, 1)
    // In the mutant: SafeMath.sub(address(this).balance, msg.value+1) = sub(balance, 2)
    // With balance = 1, the mutant will revert (assert(b <= a) fails) while original succeeds
    await expect(
      instance.connect(addr1).buyDrugs({ value: 1 })
    ).to.not.be.reverted;
  });
});