import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m079e7c1a test", function () {
  it("should revert when external call fails, but mutant does not revert", async function () {
    const [owner, from, addr1] = await ethers.getSigners();
    
    // Deploy a simple failing contract that will return false on transferFrom
    const FailingToken = await ethers.getContractFactory(
      "contract FailingToken { function transferFrom(address, address, uint256) external pure returns (bool) { return false; } }"
    );
    const failingToken = await FailingToken.deploy();
    await failingToken.waitForDeployment();

    // Deploy EBU (no constructor arguments needed)
    const EBU = await ethers.getContractFactory("EBU");
    const ebu = await EBU.deploy();
    await ebu.waitForDeployment();

    const tos = [addr1.address];
    const amounts = [ethers.parseEther("1")];

    // This should revert in the original but succeed in the mutant
    // We expect the mutant to NOT revert, so we assert it does revert to kill the mutant
    await expect(
      ebu.transfer(from.address, failingToken.target, tos, amounts)
    ).to.be.reverted;
  });
});