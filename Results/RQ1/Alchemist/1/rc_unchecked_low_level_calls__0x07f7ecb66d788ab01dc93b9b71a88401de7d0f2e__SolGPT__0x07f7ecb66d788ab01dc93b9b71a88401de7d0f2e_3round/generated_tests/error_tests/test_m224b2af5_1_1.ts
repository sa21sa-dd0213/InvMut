import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m224b2af5 test", function () {
  it("should detect removal of require(_s) in donateToWhale by checking that donate reverts when whale is a contract that rejects ETH", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a contract that rejects ETH to serve as the whale
    const RejectingWhaleFactory = await ethers.getContractFactory("RejectingWhale");
    const rejectingWhale = await RejectingWhaleFactory.deploy();
    await rejectingWhale.waitForDeployment();

    // Deploy PoCGame with the rejecting whale address
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(await rejectingWhale.getAddress(), betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // This should revert in the original (require(_s) fails), but succeed in the mutant
    // So we expect revert - the mutant will NOT revert, making the test fail (killing the mutant)
    await expect(
      instance.connect(addr1).donate({ value: ethers.parseEther("0.1") })
    ).to.be.reverted;
  });
});

// Helper contract that rejects ETH
contract RejectingWhale {
  receive() external payable {
    revert("ETH not accepted");
  }
}