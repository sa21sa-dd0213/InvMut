import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant test - multiplication vs addition", function () {
  it("should detect mutant that changes * to + in _value calculation", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: deploy a simple ERC20 token for the transferFrom call
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to the 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Prepare parameters: v=2, decimals=18 => expected _value = 2 * 10^18 = 2 ether
    const v = 2;
    const decimals = 18;
    const recipients = [to.address];
    const expectedValue = ethers.parseEther("2"); // 2 * 10^18

    // Record balances before transfer
    const balanceBefore = await token.balanceOf(to.address);

    // Execute the airDrop transfer
    await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      decimals
    );

    // Check balance after - original would transfer 2 ether, mutant would transfer ~1 ether + 10^18 (i.e., 2 + 10^18)
    const balanceAfter = await token.balanceOf(to.address);
    const actualTransferred = balanceAfter - balanceBefore;

    // The mutant would transfer v + 10^decimals = 2 + 10^18, which is less than 2 * 10^18
    // So if we expect exactly 2 * 10^18, the mutant will fail this assertion
    expect(actualTransferred).to.equal(expectedValue);
  });
});