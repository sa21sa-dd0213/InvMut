import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m654f3dec", function () {
  it("should complete transfer successfully when underlying call succeeds, but mutant reverts always", async function () {
    // Deploy a simple ERC20 token for testing transferFrom
    const tokenFactory = await ethers.getContractFactory("TestToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Deploy EBU contract (no constructor arguments)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();

    const [owner, from, to] = await ethers.getSigners();

    // Setup: mint tokens to 'from' and approve EBU contract to spend them
    await token.mint(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(await ebu.getAddress(), ethers.parseEther("50"));

    // Prepare parameters for transfer function
    const recipients = [to.address];
    const amounts = [ethers.parseEther("10")];

    // Execute transfer - should succeed on original, fail on mutant
    await expect(
      ebu.connect(owner).transfer(from.address, tokenAddress, recipients, amounts)
    ).to.not.be.reverted;
  });
});

// Helper contract for testing - simple ERC20 with mint and transferFrom
// This would be deployed as a separate Solidity contract in the test environment