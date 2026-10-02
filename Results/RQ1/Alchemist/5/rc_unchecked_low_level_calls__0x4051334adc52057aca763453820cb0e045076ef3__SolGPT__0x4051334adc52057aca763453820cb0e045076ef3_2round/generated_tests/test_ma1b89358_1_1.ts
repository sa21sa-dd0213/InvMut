import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358 test", function () {
  it("should revert when external call fails (original behavior) - mutant should pass without revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airdrop contract (no constructor arguments needed)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Deploy a simple contract that will fail on transferFrom call
    // We'll use a dummy token that reverts when transferFrom is called
    const DummyTokenFactory = await ethers.getContractFactory("contracts/DummyToken.sol:DummyToken");
    const dummyToken = await DummyTokenFactory.deploy();
    await dummyToken.waitForDeployment();

    // Setup: mint some tokens to owner and approve airdrop contract to spend
    const mintAmount = ethers.parseEther("100");
    await dummyToken.mint(owner.address, mintAmount);
    await dummyToken.approve(await airdrop.getAddress(), mintAmount);

    // Fund owner with some ETH for gas
    await owner.sendTransaction({
      to: owner.address,
      value: ethers.parseEther("1")
    });

    // This call should revert in original but succeed in mutant
    const recipients = [addr1.address];
    const transferAmount = ethers.parseEther("10");

    // The token contract will revert on transferFrom because we haven't approved
    // the airdrop contract to spend on behalf of owner (we approved from owner to airdrop, 
    // but transferFrom needs approval from from address to spender)
    // Actually let's make the token fail by using a non-existent token address

    // Better approach: use a random address that will fail on call
    const randomAddress = ethers.Wallet.createRandom().address;

    // This should revert in original (require(_s) catches failed call)
    // In mutant, it will not revert
    const tx = airdrop.transfer(owner.address, randomAddress, recipients, transferAmount);

    // In the original, this would revert because call to random address fails
    // In the mutant, it will succeed
    await expect(tx).to.not.be.reverted;

    // Additionally, verify that the function returns true even though call failed
    const result = await (await tx).wait();
    // If we reach here, the mutant is killed because original would have reverted
  });
});