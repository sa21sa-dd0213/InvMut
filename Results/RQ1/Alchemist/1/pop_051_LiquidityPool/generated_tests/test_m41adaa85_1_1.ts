import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - withdraw return value", function () {
  it("should detect mutant m41adaa85 by verifying withdraw returns the correct shares redeemed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 asset token
    const AssetTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const assetToken = await AssetTokenFactory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheToken (share)
    const TrancheTokenFactory = await ethers.getContractFactory("TrancheTokenMock");
    const shareToken = await TrancheTokenFactory.deploy("Tranche", "TRN", 18);
    await shareToken.waitForDeployment();

    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("InvestmentManagerMock");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();

    // Deploy LiquidityPool with constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();

    // Setup: authorize owner and set up test scenario
    // Transfer some asset tokens to addr1 for deposit
    const depositAmount = ethers.parseEther("100");
    await assetToken.mint(addr1.address, depositAmount);

    // Approve LiquidityPool to spend assets
    await assetToken.connect(addr1).approve(await liquidityPool.getAddress(), depositAmount);

    // Perform a deposit to get shares
    await liquidityPool.connect(addr1).deposit(depositAmount, addr1.address);

    // Get the shares balance of addr1
    const sharesBalance = await liquidityPool.balanceOf(addr1.address);

    // Now test withdraw - the mutant removes return statement
    // For the original, withdraw returns the shares redeemed
    // For the mutant, it will return 0 or undefined

    // Approve shares for burning (withdraw)
    await shareToken.connect(addr1).approve(await liquidityPool.getAddress(), sharesBalance);

    // Attempt withdraw with a specific amount of assets
    const withdrawAssets = ethers.parseEther("50");

    // Call withdraw and capture the return value
    const tx = await liquidityPool.connect(addr1).withdraw(withdrawAssets, addr1.address, addr1.address);
    const receipt = await tx.wait();

    // Get the shares redeemed from the event (Withdraw event emits shares)
    const withdrawEvent = receipt.logs.find(
      (log) => log.topics[0] === ethers.id("Withdraw(address,address,address,uint256,uint256)")
    );

    if (withdrawEvent) {
      const decodedLog = liquidityPool.interface.parseLog({
        topics: withdrawEvent.topics,
        data: withdrawEvent.data,
      });

      // The mutant should return 0 instead of the actual shares redeemed
      // We can check the return value by calling withdraw as a static call
      const expectedSharesRedeemed = await liquidityPool.connect(addr1).withdraw.staticCall(
        withdrawAssets,
        addr1.address,
        addr1.address
      );

      // If the mutant is active, the actual return will differ from expected
      // We test this by checking the event emitted value matches the expected return
      expect(decodedLog.args.shares).to.equal(expectedSharesRedeemed);
    }

    // Alternative: directly check the return value of withdraw
    // This will catch the mutant because the return statement is removed
    const result = await ethers.provider.call({
      from: addr1.address,
      to: await liquidityPool.getAddress(),
      data: liquidityPool.interface.encodeFunctionData("withdraw", [
        withdrawAssets,
        addr1.address,
        addr1.address,
      ]),
    });

    const decodedResult = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], result);

    // The decoded result should match the expected shares redeemed
    // For the original contract this returns the correct value
    // For the mutant this returns 0 (default) because return statement is removed
    expect(decodedResult[0]).to.equal(expectedSharesRedeemed);
  });
});